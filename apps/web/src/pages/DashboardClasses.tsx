import React, { useState, useEffect } from 'react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { apiClient } from '../lib/api';

export const DashboardClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clsRes, mjrRes] = await Promise.all([
        apiClient<any[]>('/classes'),
        apiClient<any[]>('/majors')
      ]);
      setClasses(clsRes);
      setMajors(mjrRes);
    } catch (error) {
      console.error('Failed to fetch classes or majors', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-darkPrimary">Pengaturan Kelas & Jurusan</h1>
        <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
          Kelola data jurusan, daftar kelas, dan penugasan Wali Kelas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Jurusan</h2>
            <Button size="sm">Tambah Jurusan</Button>
          </div>
          {loading ? <p className="text-gray-500">Memuat...</p> : (
            <ul className="space-y-2">
              {majors.map(m => (
                <li key={m.id} className="p-3 border rounded-lg flex justify-between">{m.name} ({m.code})</li>
              ))}
              {majors.length === 0 && <li className="text-gray-400 text-sm">Belum ada jurusan</li>}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-200 dark:border-[#222] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Kelas</h2>
            <Button size="sm">Tambah Kelas</Button>
          </div>
          {loading ? <p className="text-gray-500">Memuat...</p> : (
            <ul className="space-y-2">
              {classes.map(c => (
                <li key={c.id} className="p-3 border rounded-lg flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-xs text-gray-500">Wali: {c.homeroomTeacherId || 'Belum di-assign'}</span>
                </li>
              ))}
              {classes.length === 0 && <li className="text-gray-400 text-sm">Belum ada kelas</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
