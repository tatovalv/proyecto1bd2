import { randomUUID } from "crypto";
import neo4j from "neo4j-driver";
import mongoose from "mongoose";
import { getNeo4jDriver } from "../config/neo4j.js";
import { CourseContent } from "../models/CourseContent.js";

function driverOrThrow() {
  const d = getNeo4jDriver();
  if (!d) throw new Error("NEO4J_UNAVAILABLE");
  return d;
}

function mongoReady() {
  return mongoose.connection.readyState === 1;
}

function mapCourse(rec) {
  const c = rec.get("c");
  if (!c) return null;
  const p = c.properties;
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description ?? "",
    startDate: p.startDate,
    endDate: p.endDate,
    photoUrl: p.photoUrl ?? null,
    published: Boolean(p.published),
    createdAt: p.createdAt,
  };
}

export async function createCourse(teacherId, body) {
  if (!mongoReady()) throw new Error("MONGO_UNAVAILABLE");
  const id = randomUUID();
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `MERGE (u:User {id: $teacherId})
         ON CREATE SET
           u.username = $teacherUsername,
           u.fullName = $teacherFullName,
           u.role = 'teacher'
         CREATE (c:Course {
           id: $id,
           code: $code,
           name: $name,
           description: $description,
           startDate: $startDate,
           endDate: $endDate,
           photoUrl: $photoUrl,
           published: false,
           createdAt: datetime()
         })
         MERGE (u)-[:TEACHES]->(c)`,
        {
          teacherId,
          teacherUsername: body.teacherUsername ?? `user-${teacherId}`,
          teacherFullName: body.teacherFullName ?? body.teacherUsername ?? `User ${teacherId}`,
          id,
          code: body.code,
          name: body.name,
          description: body.description ?? "",
          startDate: body.startDate,
          endDate: body.endDate ?? null,
          photoUrl: body.photoUrl ?? null,
        }
      );
    });
  } finally {
    await session.close();
  }
  await CourseContent.create({ courseId: id, sections: [] });
  return id;
}

export async function listTeachingCourses(teacherId) {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User {id: $id})-[:TEACHES]->(c:Course) RETURN c ORDER BY c.createdAt DESC",
        { id: teacherId }
      )
    );
    return res.records.map(mapCourse).filter(Boolean);
  } finally {
    await session.close();
  }
}

export async function listPublishedCourses() {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (c:Course) WHERE c.published = true RETURN c ORDER BY c.name ASC"
      )
    );
    return res.records.map(mapCourse).filter(Boolean);
  } finally {
    await session.close();
  }
}

export async function getCourse(courseId) {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run("MATCH (c:Course {id: $id}) RETURN c", { id: courseId })
    );
    if (!res.records.length) return null;
    return mapCourse(res.records[0]);
  } finally {
    await session.close();
  }
}

/** Primer docente vinculado con TEACHES (para consultas de curso en UI). */
export async function getPrimaryTeacherId(courseId) {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User)-[:TEACHES]->(c:Course {id: $id}) RETURN u.id AS id LIMIT 1",
        { id: courseId }
      )
    );
    return res.records[0]?.get("id") || null;
  } finally {
    await session.close();
  }
}

export async function userTeachesCourse(userId, courseId) {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User {id: $uid})-[:TEACHES]->(c:Course {id: $cid}) RETURN count(c) AS n",
        { uid: userId, cid: courseId }
      )
    );
    return Number(res.records[0]?.get("n") || 0) > 0;
  } finally {
    await session.close();
  }
}

export async function userEnrolledInCourse(userId, courseId) {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User {id: $uid})-[:ENROLLED_IN]->(c:Course {id: $cid}) RETURN count(c) AS n",
        { uid: userId, cid: courseId }
      )
    );
    return Number(res.records[0]?.get("n") || 0) > 0;
  } finally {
    await session.close();
  }
}

export async function updateCourse(courseId, patch) {
  const allowed = ["code", "name", "description", "startDate", "endDate", "photoUrl", "published"];
  const clean = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) clean[k] = patch[k];
  }
  if (!Object.keys(clean).length) return;
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(`MATCH (c:Course {id: $id}) SET c += $patch`, { id: courseId, patch: clean });
    });
  } finally {
    await session.close();
  }
}

export async function publishCourse(courseId) {
  await updateCourse(courseId, { published: true });
}

export async function listStudents(courseId) {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User)-[:ENROLLED_IN]->(c:Course {id: $cid}) RETURN u.id AS id, u.username AS username, u.fullName AS fullName",
        { cid: courseId }
      )
    );
    return res.records.map((r) => ({
      id: r.get("id"),
      username: r.get("username"),
      fullName: r.get("fullName"),
    }));
  } finally {
    await session.close();
  }
}

export async function enrollStudent(studentId, courseId) {
  const course = await getCourse(courseId);
  if (!course) throw new Error("NOT_FOUND");
  if (!course.published) throw new Error("NOT_PUBLISHED");
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `MATCH (u:User {id: $sid}), (c:Course {id: $cid})
         MERGE (u)-[:ENROLLED_IN]->(c)`,
        { sid: studentId, cid: courseId }
      );
    });
  } finally {
    await session.close();
  }
}

export async function listEnrolledCourses(studentId) {
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User {id: $id})-[:ENROLLED_IN]->(c:Course) RETURN c ORDER BY c.name ASC",
        { id: studentId }
      )
    );
    return res.records.map(mapCourse).filter(Boolean);
  } finally {
    await session.close();
  }
}

export async function cloneCourse(teacherId, sourceCourseId, body) {
  if (!mongoReady()) throw new Error("MONGO_UNAVAILABLE");
  const src = await getCourse(sourceCourseId);
  if (!src) throw new Error("NOT_FOUND");
  const can = await userTeachesCourse(teacherId, sourceCourseId);
  if (!can) throw new Error("FORBIDDEN");
  const newId = randomUUID();
  const driver = driverOrThrow();
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `MERGE (u:User {id: $tid})
         ON CREATE SET
           u.username = $teacherUsername,
           u.fullName = $teacherFullName,
           u.role = 'teacher'
         CREATE (c:Course {
           id: $newId,
           code: $code,
           name: $name,
           description: $description,
           startDate: $startDate,
           endDate: $endDate,
           photoUrl: $photoUrl,
           published: false,
           createdAt: datetime()
         })
         MERGE (u)-[:TEACHES]->(c)`,
        {
          tid: teacherId,
          teacherUsername: body.teacherUsername ?? `user-${teacherId}`,
          teacherFullName: body.teacherFullName ?? body.teacherUsername ?? `User ${teacherId}`,
          newId,
          code: body.code,
          name: body.name ?? `Copia de ${src.name}`,
          description: body.description ?? src.description,
          startDate: body.startDate ?? src.startDate,
          endDate: body.endDate ?? src.endDate,
          photoUrl: body.photoUrl ?? src.photoUrl,
        }
      );
    });
  } finally {
    await session.close();
  }
  const doc = await CourseContent.findOne({ courseId: sourceCourseId }).lean();
  const sections = doc?.sections ? JSON.parse(JSON.stringify(doc.sections)) : [];
  await CourseContent.create({ courseId: newId, sections });
  return newId;
}

export async function getCourseContentDoc(courseId) {
  if (!mongoReady()) return null;
  return CourseContent.findOne({ courseId });
}
