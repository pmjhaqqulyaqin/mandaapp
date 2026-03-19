import { db } from "./src/db";
import { studentProfiles } from "./src/db/schema";
import { StudentService } from "./src/modules/students/service";

async function run() {
  try {
    const students = await db.select().from(studentProfiles).limit(1);
    if (students.length === 0) {
      console.log("No students to delete.");
      return;
    }
    const student = students[0];
    console.log("Deleting student:", student.id);
    const deleted = await StudentService.deleteStudent(student.id);
    console.log("Deleted:", deleted);
  } catch (err: any) {
    console.error("Delete failed:", err.message);
  }
  process.exit(0);
}
run();
