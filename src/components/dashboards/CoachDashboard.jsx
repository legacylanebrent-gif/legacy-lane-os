import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, DollarSign, Star, Plus } from 'lucide-react';

export default function CoachDashboard({ user }) {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    avgRating: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [courses, enrollments] = await Promise.all([
        base44.entities.Course.filter({ instructor_id: user.id }),
        base44.entities.Enrollment.list()
      ]);

      const courseIds = courses.map(c => c.id);
      const relevantEnrollments = enrollments.filter(e => courseIds.includes(e.course_id));
      
      const avgRating = courses.reduce((sum, c) => sum + (c.rating || 0), 0) / (courses.length || 1);

      setStats({
        totalCourses: courses.length,
        totalStudents: relevantEnrollments.length,
        totalRevenue: courses.reduce((sum, c) => sum + (c.price * c.enrollment_count || 0), 0),
        avgRating: avgRating.toFixed(1)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Instructor Dashboard
          </h1>
          <p className="text-slate-600">Manage your courses and students</p>
        </div>
        <Link to={createPageUrl('Courses')}>
          <Button className="bg-gold-600 hover:bg-gold-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Courses</CardTitle>
            <GraduationCap className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.totalCourses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Students</CardTitle>
            <Users className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">
              ${stats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Rating</CardTitle>
            <Star className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.avgRating}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif text-navy-900">Your Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">Your courses will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}