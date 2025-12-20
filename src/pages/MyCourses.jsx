import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, BookOpen, Award, Clock, ChevronRight } from 'lucide-react';

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await base44.auth.me();
      setUser(userData);

      const enrollmentData = await base44.entities.Enrollment.filter({ user_id: userData.id });
      setEnrollments(enrollmentData);

      if (enrollmentData.length > 0) {
        const courseIds = enrollmentData.map(e => e.course_id);
        const allCourses = await base44.entities.Course.list();
        const userCourses = allCourses.filter(c => courseIds.includes(c.id));
        setCourses(userCourses);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEnrollmentForCourse = (courseId) => {
    return enrollments.find(e => e.course_id === courseId);
  };

  const stats = {
    total: enrollments.length,
    inProgress: enrollments.filter(e => !e.completed && e.progress > 0).length,
    completed: enrollments.filter(e => e.completed).length,
    certificates: enrollments.filter(e => e.certificate_issued).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            My Courses
          </h1>
          <p className="text-slate-600">Track your learning journey</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Enrolled</CardTitle>
              <BookOpen className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
              <GraduationCap className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Certificates</CardTitle>
              <Award className="h-5 w-5 text-gold-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.certificates}</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-24 w-full" />
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No courses yet
            </h3>
            <p className="text-slate-500 mb-6">
              Start learning by enrolling in a course
            </p>
            <Link to={createPageUrl('Courses')}>
              <Button className="bg-gold-600 hover:bg-gold-700">
                Browse Courses
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {courses.map(course => {
              const enrollment = getEnrollmentForCourse(course.id);
              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <img
                        src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'}
                        alt={course.title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-serif font-bold text-navy-900 mb-1">
                              {course.title}
                            </h3>
                            <p className="text-sm text-slate-600">
                              by {course.instructor_name}
                            </p>
                          </div>
                          
                          {enrollment?.completed ? (
                            <Badge className="bg-green-100 text-green-800">
                              <Award className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">
                              In Progress
                            </Badge>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                            <span>Progress: {enrollment?.progress || 0}%</span>
                            <span>
                              {enrollment?.completed_lessons?.length || 0} / {course.total_lessons} lessons
                            </span>
                          </div>
                          <Progress value={enrollment?.progress || 0} className="h-2" />
                        </div>

                        <div className="mt-4 flex gap-3">
                          <Link to={createPageUrl(`CourseLearning?id=${course.id}`)}>
                            <Button className="bg-gold-600 hover:bg-gold-700">
                              {enrollment?.progress > 0 ? 'Continue Learning' : 'Start Course'}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                          
                          {enrollment?.certificate_issued && (
                            <Button variant="outline">
                              <Award className="w-4 h-4 mr-2" />
                              View Certificate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}