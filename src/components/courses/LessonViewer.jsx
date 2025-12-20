import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function LessonViewer({
  lesson,
  isCompleted,
  onComplete,
  onStartQuiz,
  hasQuiz,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext
}) {
  if (!lesson) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-2xl font-serif text-navy-900">
            {lesson.title}
          </CardTitle>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          )}
        </div>
        {lesson.description && (
          <p className="text-slate-600 mt-2">{lesson.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Video */}
        {lesson.video_url && (
          <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
            <video
              controls
              className="w-full h-full"
              src={lesson.video_url}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Content */}
        {lesson.content && (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown>{lesson.content}</ReactMarkdown>
          </div>
        )}

        {/* Resources */}
        {lesson.resources && lesson.resources.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-navy-900 mb-3">
              Resources
            </h3>
            <div className="space-y-2">
              {lesson.resources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-sage-50 transition-colors"
                >
                  <FileText className="w-5 h-5 text-gold-600" />
                  <div className="flex-1">
                    <p className="font-medium text-navy-900">{resource.title}</p>
                    <p className="text-sm text-slate-500">{resource.type}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-3">
            {hasQuiz && !isCompleted && (
              <Button
                onClick={onStartQuiz}
                variant="outline"
                className="border-gold-500 text-gold-700 hover:bg-gold-50"
              >
                Take Quiz
              </Button>
            )}

            {!isCompleted && (
              <Button
                onClick={onComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}

            {hasNext && (
              <Button
                onClick={onNext}
                className="bg-gold-600 hover:bg-gold-700"
              >
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}