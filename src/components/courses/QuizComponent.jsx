import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Award } from 'lucide-react';

export default function QuizComponent({ quiz, lessonId, onComplete, onCancel }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">No quiz available for this lesson</p>
          <Button onClick={onCancel} className="mt-4">Back to Lesson</Button>
        </CardContent>
      </Card>
    );
  }

  const questions = quiz.questions;
  const question = questions[currentQuestion];
  const passingScore = quiz.passing_score || 70;

  const handleNext = () => {
    if (selectedAnswer !== null) {
      setAnswers({ ...answers, [currentQuestion]: selectedAnswer });
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        calculateResults({ ...answers, [currentQuestion]: selectedAnswer });
      }
    }
  };

  const calculateResults = (finalAnswers) => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (finalAnswers[index] === q.correct_answer) {
        correct++;
      }
    });
    
    const score = Math.round((correct / questions.length) * 100);
    setShowResults(true);
    
    setTimeout(() => {
      onComplete(score);
    }, 3000);
  };

  if (showResults) {
    const correct = Object.keys(answers).filter(
      key => answers[key] === questions[key].correct_answer
    ).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passingScore;

    return (
      <Card>
        <CardContent className="p-12 text-center">
          {passed ? (
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
          ) : (
            <XCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
          )}
          
          <h2 className="text-3xl font-serif font-bold text-navy-900 mb-2">
            {passed ? 'Congratulations!' : 'Keep Trying!'}
          </h2>
          
          <p className="text-lg text-slate-600 mb-6">
            You scored {score}% ({correct} out of {questions.length} correct)
          </p>

          {passed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                You passed! The lesson will be marked as complete.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800">
                You need {passingScore}% to pass. Review the lesson and try again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            Question {currentQuestion + 1} of {questions.length}
          </Badge>
          <Badge className="bg-gold-600">
            <Award className="w-3 h-3 mr-1" />
            Passing Score: {passingScore}%
          </Badge>
        </div>
        <CardTitle className="text-2xl font-serif text-navy-900">
          {question.question}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <RadioGroup value={selectedAnswer?.toString()} onValueChange={(val) => setSelectedAnswer(parseInt(val))}>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-colors cursor-pointer ${
                  selectedAnswer === index
                    ? 'border-gold-500 bg-gold-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <Button
            onClick={handleNext}
            disabled={selectedAnswer === null}
            className="bg-gold-600 hover:bg-gold-700"
          >
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}