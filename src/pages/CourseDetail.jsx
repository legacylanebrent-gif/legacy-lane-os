import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Clock, BarChart3, Award, Star, Users, ChevronRight, BookOpen } from 'lucide-react';

export default function CourseDetail() {
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadCourse();
  }, []);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get('id');

      if (!courseId) {
        navigate(createPageUrl('Courses'));
        return;
      }

      const userData = await base44.auth.me();
      setUser(userData);

      const allCourses = await base44.entities.Course.list();
      const courseData = allCourses.find(c => c.id === courseId);
      
      if (!courseData) {
        navigate(createPageUrl('Courses'));
        return;
      }

      setCourse(courseData);

      const lessonsData = await base44.entities.Lesson.filter({ course_id: courseId });
      setLessons(lessonsData.sort((a, b) => a.order_index - b.order_index));

      const enrollments = await base44.entities.Enrollment.filter({
        user_id: userData.id,
        course_id: courseId
      });
      
      if (enrollments.length > 0) {
        setEnrollment(enrollments[0]);
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const newEnrollment = await base44.entities.Enrollment.create({
        user_id: user.id,
        course_id: course.id,
        enrolled_date: new Date().toISOString(),
        progress: 0,
        completed: false,
        completed_lessons: [],
        quiz_scores: {}
      });
      
      setEnrollment(newEnrollment);
      navigate(createPageUrl(`CourseLearning?id=${course.id}`));
    } catch (error) {
      console.error('Error enrolling:', error);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      {/* Hero */}
      <div className="bg-navy-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="bg-gold-600 text-white mb-4">
                {course.category?.replace(/_/g, ' ')}
              </Badge>
              
              <h1 className="text-4xl font-serif font-bold mb-4">
                {course.title}
              </h1>
              
              <p className="text-slate-300 text-lg mb-6">
                {course.description}
              </p>

              <div className="flex items-center gap-6 text-sm mb-6">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-gold-400" />
                  <span>{course.instructor_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold-400" />
                  <span>{course.enrollment_count || 0} students</span>
                </div>
                {course.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-gold-400 fill-current" />
                    <span>{course.rating} ({course.total_reviews})</span>
                  </div>
                )}
              </div>

              {enrollment ? (
                <Button
                  onClick={() => navigate(createPageUrl(`CourseLearning?id=${course.id}`))}
                  className="bg-gold-600 hover:bg-gold-700 text-white"
                  size="lg"
                >
                  {enrollment.progress > 0 ? 'Continue Learning' : 'Start Course'}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-gold-600 hover:bg-gold-700 text-white"
                  size="lg"
                >
                  {enrolling ? 'Enrolling...' : course.price > 0 ? `Enroll - $${course.price}` : 'Enroll for Free'}
                </Button>
              )}
            </div>

            <div>
              <img
                src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'}
                alt={course.title}
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-serif font-bold text-navy-900 mb-6">
                  Course Content
                </h2>

                <div className="space-y-3">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-sage-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-sm font-semibold text-gold-700">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-navy-900">
                            {lesson.title}
                          </h3>
                          {lesson.duration_minutes && (
                            <p className="text-sm text-slate-500">
                              {lesson.duration_minutes} minutes
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {enrollment?.completed_lessons?.includes(lesson.id) && (
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-navy-900 mb-4">Course Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gold-600" />
                    <div>
                      <p className="text-sm text-slate-500">Duration</p>
                      <p className="font-semibold">{course.duration_hours || 0} hours</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gold-600" />
                    <div>
                      <p className="text-sm text-slate-500">Lessons</p>
                      <p className="font-semibold">{course.total_lessons || lessons.length}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-gold-600" />
                    <div>
                      <p className="text-sm text-slate-500">Level</p>
                      <p className="font-semibold capitalize">{course.level}</p>
                    </div>
                  </div>

                  {course.certification_awarded && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-gold-600" />
                        <div>
                          <p className="text-sm text-slate-500">Certificate</p>
                          <p className="font-semibold">Yes</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}