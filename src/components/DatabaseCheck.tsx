import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function DatabaseCheck() {
  const [status, setStatus] = useState<Record<string, 'loading' | 'ok' | 'error'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tables = [
    'meetings',
    'shared_meetings',
    'topics',
    'topic_participants',
    'breaks',
    'meeting_execution_logs',
    'subscriptions'
  ];

  useEffect(() => {
    async function checkTables() {
      const newStatus: Record<string, 'loading' | 'ok' | 'error'> = {};
      const newErrors: Record<string, string> = {};

      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1);
          if (error) {
            newStatus[table] = 'error';
            newErrors[table] = error.message;
          } else {
            newStatus[table] = 'ok';
          }
        } catch (err: any) {
          newStatus[table] = 'error';
          newErrors[table] = err.message;
        }
        setStatus({ ...newStatus });
        setErrors({ ...newErrors });
      }
    }

    checkTables();
  }, []);

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6 text-sm">
      <h3 className="font-bold mb-2">Status do Banco de Dados:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {tables.map(table => (
          <div key={table} className="flex items-center justify-between p-2 bg-white rounded border border-slate-100">
            <span className="font-mono text-xs">{table}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              status[table] === 'ok' ? 'bg-green-100 text-green-700' :
              status[table] === 'error' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {status[table] || 'checking...'}
            </span>
            {errors[table] && (
              <div className="text-[10px] text-red-500 mt-1 block w-full">
                {errors[table]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
