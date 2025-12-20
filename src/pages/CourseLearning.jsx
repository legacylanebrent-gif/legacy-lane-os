import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import LessonViewer from '@/components/courses/LessonViewer';
import QuizComponent from '@/components/courses/QuizComponent';

export default function CourseLearning() {
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    loadCourse();
  }, []);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get('id');

      const userData = await base44.auth.me();
      const allCourses = await base44.entities.Course.list();
      const courseData = allCourses.find(c => c.id === courseId);
      
      setCourse(courseData);

      const lessonsData = await base44.entities.Lesson.filter({ course_id: courseId });
      const sortedLessons = lessonsData.sort((a, b) => a.order_index - b.order_index);
      setLessons(sortedLessons);

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

  const markLessonComplete = async () => {
    if (!enrollment || !lessons[currentLessonIndex]) return;

    const currentLesson = lessons[currentLessonIndex];
    const completedLessons = enrollment.completed_lessons || [];

    if (!completedLessons.includes(currentLesson.id)) {
      const newCompleted = [...completedLessons, currentLesson.id];
      const progress = Math.round((newCompleted.length / lessons.length) * 100);
      const completed = progress === 100;

      await base44.entities.Enrollment.update(enrollment.id, {
        completed_lessons: newCompleted,
        progress: progress,
        completed: completed,
        completion_date: completed ? new Date().toISOString() : null,
        certificate_issued: completed && course.certification_awarded,
        last_accessed: new Date().toISOString()
      });

      setEnrollment({
        ...enrollment,
        completed_lessons: newCompleted,
        progress: progress,
        completed: completed
      });
    }

    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setShowQuiz(false);
    }
  };

  const handleQuizComplete = async (score) => {
    const currentLesson = lessons[currentLessonIndex];
    const quizScores = enrollment.quiz_scores || {};
    quizScores[currentLesson.id] = score;

    await base44.entities.Enrollment.update(enrollment.id, {
      quiz_scores: quizScores
    });

    if (score >= (currentLesson.quiz?.passing_score || 70)) {
      markLessonComplete();
    }
  };

  if (loading || !course) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const currentLesson = lessons[currentLessonIndex];
  const isLessonCompleted = enrollment?.completed_lessons?.includes(currentLesson?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('MyCourses'))}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to My Courses
            </Button>

            {enrollment?.completed && (
              <Badge className="bg-gold-600">
                <Award className="w-4 h-4 mr-1" />
                Course Completed
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-serif font-bold text-navy-900 mb-2">
            {course.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>Lesson {currentLessonIndex + 1} of {lessons.length}</span>
            <Progress value={enrollment?.progress || 0} className="flex-1 max-w-xs h-2" />
            <span>{enrollment?.progress || 0}% Complete</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-24">
              <h3 className="font-semibold text-navy-900 mb-4">Course Content</h3>
              <div className="space-y-2">
                {lessons.map((lesson, index) => {
                  const isCompleted = enrollment?.completed_lessons?.includes(lesson.id);
                  const isCurrent = index === currentLessonIndex;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setCurrentLessonIndex(index);
                        setShowQuiz(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isCurrent
                          ? 'bg-gold-100 border-2 border-gold-500'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-900 truncate">
                            {lesson.title}
                          </p>
                          {lesson.duration_minutes && (
                            <p className="text-xs text-slate-500">
                              {lesson.duration_minutes} min
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!showQuiz ? (
              <LessonViewer
                lesson={currentLesson}
                isCompleted={isLessonCompleted}
                onComplete={markLessonComplete}
                onStartQuiz={() => currentLesson.quiz && setShowQuiz(true)}
                hasQuiz={!!currentLesson.quiz}
                hasPrevious={currentLessonIndex > 0}
                hasNext={currentLessonIndex < lessons.length - 1}
                onPrevious={() => {
                  setCurrentLessonIndex(currentLessonIndex - 1);
                  setShowQuiz(false);
                }}
                onNext={() => {
                  setCurrentLessonIndex(currentLessonIndex + 1);
                  setShowQuiz(false);
                }}
              />
            ) : (
              <QuizComponent
                quiz={currentLesson.quiz}
                lessonId={currentLesson.id}
                onComplete={handleQuizComplete}
                onCancel={() => setShowQuiz(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}