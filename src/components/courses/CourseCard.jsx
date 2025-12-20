import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Star, Award, BarChart3 } from 'lucide-react';

export default function CourseCard({ course }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        <img
          src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <Badge className="bg-gold-600 text-white capitalize">
            {course.level}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <h3 className="text-lg font-serif font-bold text-navy-900 leading-tight line-clamp-2">
          {course.title}
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          by {course.instructor_name}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 line-clamp-2">
          {course.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-slate-500">
          {course.duration_hours && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration_hours}h</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{course.enrollment_count || 0}</span>
          </div>

          {course.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              <span>{course.rating}</span>
            </div>
          )}
        </div>

        {course.certification_awarded && (
          <div className="flex items-center gap-2 text-sm text-gold-700 bg-gold-50 px-3 py-2 rounded-lg">
            <Award className="w-4 h-4" />
            <span>Certificate upon completion</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-2xl font-bold text-navy-900">
            {course.price > 0 ? `$${course.price}` : 'Free'}
          </span>
          <Badge variant="outline" className="capitalize">
            {course.category?.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}