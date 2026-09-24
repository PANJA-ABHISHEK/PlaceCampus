'use client';

import { useQuery } from '@tanstack/react-query';
import { readinessApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';

export default function ReadinessPage() {
  const { data: score, isLoading } = useQuery({
    queryKey: ['readinessScore'],
    queryFn: () => readinessApi.getScore(),
  });

  if (isLoading) {
    return <div className="p-8">Loading your readiness report...</div>;
  }

  if (!score) {
    return <div className="p-8">Could not generate readiness score. Please ensure your profile is complete.</div>;
  }

  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-600';
    if (value >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">Readiness Report</h2>
          <p className="text-muted-foreground">AI-driven analysis of your placement readiness.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Last updated</p>
          <p className="font-medium">{format(new Date(score.lastCalculatedAt), 'PPP')}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Overall Score */}
        <Card className="md:col-span-1 border-[#5B2A86]/20 shadow-sm flex flex-col justify-center items-center p-6 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Overall Score</h3>
          <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-8 border-gray-200">
            <span className={`text-5xl font-bold ${getScoreColor(score.overallScore)}`}>{score.overallScore}</span>
            <div 
              className="absolute inset-0 rounded-full border-8 border-transparent"
              style={{
                borderColor: score.overallScore >= 80 ? '#16a34a' : score.overallScore >= 60 ? '#f97316' : '#ef4444',
                clipPath: `polygon(0 0, 100% 0, 100% ${score.overallScore}%, 0 ${score.overallScore}%)` // simplistic circle fill simulation
              }}
            ></div>
          </div>
          <p className="mt-4 text-center text-sm font-medium text-gray-500">
            {score.overallScore >= 80 ? 'Highly Ready' : score.overallScore >= 60 ? 'Needs Improvement' : 'Not Ready'}
          </p>
        </Card>

        {/* AI Feedback */}
        <Card className="md:col-span-2 border-[#5B2A86]/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" /> AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">
              {score.aiFeedback}
            </p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-xl font-bold tracking-tight text-[#5B2A86] mt-8">Dimensional Analysis</h3>
      
      <div className="grid gap-6 md:grid-cols-3">
        {score.dimensions.map((dim: any, i: number) => (
          <Card key={i} className="border-[#5B2A86]/20 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center mb-1">
                <CardTitle className="text-lg">{dim.name}</CardTitle>
                <span className={`font-bold ${getScoreColor(dim.score)}`}>{dim.score}/100</span>
              </div>
              <Progress value={dim.score} className="h-2" indicatorClassName={getProgressColor(dim.score)} />
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold flex items-center text-green-700 mb-2">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Strengths
                </h4>
                <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                  {dim.strengths.map((s: string, j: number) => <li key={j}>{s}</li>)}
                  {dim.strengths.length === 0 && <li>No notable strengths identified yet.</li>}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold flex items-center text-red-600 mb-2">
                  <AlertTriangle className="h-4 w-4 mr-1" /> Areas to Improve
                </h4>
                <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                  {dim.weaknesses.map((w: string, j: number) => <li key={j}>{w}</li>)}
                  {dim.weaknesses.length === 0 && <li>Looking good!</li>}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
