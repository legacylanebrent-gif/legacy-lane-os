import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { formatTimeAMPM } from '@/components/estate/saleEditorShared';

// Default daily hours offered for a sale date. Used for the FIRST date and for
// every date added after it — previously the form reset the times to empty,
// which made the next date's picker open at the current clock time instead.
const DEFAULT_TIMES = { start_time: '09:00', end_time: '14:00' };

export default function SaleDatesCard({ dates = [], onAddDate, onRemoveDate }) {
  const [form, setForm] = useState({ start_date: '', ...DEFAULT_TIMES });

  const handleAdd = () => {
    if (!form.start_date) { alert('Please enter a start date'); return; }
    onAddDate({
      date: form.start_date,
      start_time: form.start_time || DEFAULT_TIMES.start_time,
      end_time: form.end_time || DEFAULT_TIMES.end_time
    });
    setForm({ start_date: '', ...DEFAULT_TIMES });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Date &amp; Time</h2>
        <div className="space-y-4 mb-4">
          <div>
            <Label htmlFor="start-date">Select Date *</Label>
            <Input
              id="start-date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time">Daily Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end-time">Daily End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </div>
        </div>
        <Button onClick={handleAdd} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Sale Date
        </Button>
        {dates.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="font-medium text-slate-900">Sale Dates ({dates.length})</h3>
            <div className="space-y-2">
              {dates.map((saleDate, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{saleDate.date}</p>
                    {(saleDate.start_time || saleDate.end_time) && (
                      <p className="text-slate-600">{formatTimeAMPM(saleDate.start_time)} - {formatTimeAMPM(saleDate.end_time)}</p>
                    )}
                  </div>
                  <button onClick={() => onRemoveDate(index)} className="text-red-600 hover:text-red-700 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}