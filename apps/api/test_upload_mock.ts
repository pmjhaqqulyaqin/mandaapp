import fs from "fs";
import { StudentController } from "./src/modules/students/controller";
import * as xlsx from "xlsx";
import { Request, Response } from "express";
import { db } from "./src/db";
import { sql } from "drizzle-orm";
// We don't really have to use supertest, we could just mock req, res manually or use a small script.
async function run() {
  console.log("Mocking DB...");
  // just generate small xlsx buffer
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet([
    {
      NamaSiswa: "Ahmad",
      NISN: "random-" + Math.random(),
      NIS: "111",
      Kelas: "X RPL 1 - Rekayasa Perangkat Lunak",
      TempatLahir: "Jakarta",
      TanggalLahir: "10-01-2005",
      JenisKelamin: "Laki-laki",
      Alamat: "Jl. ABC"
    },
    {
      NISN: "random-" + Math.random(),
      Kelas: "X RPL 1"
    } // Ensure these match the controller expectations
  ]);
  xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

  const req = {
    file: { buffer },
    body: {}
  } as any as Request;

  const res = {
    status: (code: number) => ({
      json: (data: any) => { console.log("Status:", code, "JSON:", JSON.stringify(data)); },
    }),
    setHeader: () => {},
    end: () => {}
  } as any as Response;

  console.log("Calling uploadExcel...");
  await StudentController.uploadExcel(req, res);
  console.log("Ended.");
  process.exit(0);
}
run();
