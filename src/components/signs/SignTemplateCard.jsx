import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Printer, Download, FileText } from 'lucide-react';

export default function SignTemplateCard({ template, categoryColor, onView, onEdit, onPrint, onDownload }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border ${categoryColor || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-0.5 truncate">{template.name}</h3>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              <Button variant="outline" size="sm" className="text-xs h-7 px-1.5" onClick={() => onView(template)}>
                <Eye className="w-3 h-3 mr-0.5" />
                View
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 px-1.5" onClick={() => onEdit(template)}>
                <Pencil className="w-3 h-3 mr-0.5" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 px-1.5" onClick={() => onPrint(template)}>
                <Printer className="w-3 h-3 mr-0.5" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 px-1.5" onClick={() => onDownload(template)}>
                <Download className="w-3 h-3 mr-0.5" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}