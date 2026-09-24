'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { readinessApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, BookOpen, Code, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PreparationPage() {
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['preparationPlan'],
    queryFn: () => readinessApi.getPreparationPlan(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, isCompleted }: { taskId: string, isCompleted: boolean }) => 
      readinessApi.updateTaskStatus(taskId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparationPlan'] });
    },
    onError: () => {
      toast.error('Failed to update task status');
    }
  });

  if (isLoading) {
    return <div className="p-8">Loading your preparation plan...</div>;
  }

  if (!plan) {
    return <div className="p-8">No preparation plan found. Check back later!</div>;
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'COURSE': return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'MOCK_INTERVIEW': return <Video className="h-5 w-5 text-purple-500" />;
      case 'PRACTICE': return <Code className="h-5 w-5 text-orange-500" />;
      default: return <Trophy className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getTaskBadge = (type: string) => {
    switch (type) {
      case 'COURSE': return <Badge variant="outline" className="text-blue-500 border-blue-500">Course</Badge>;
      case 'MOCK_INTERVIEW': return <Badge variant="outline" className="text-purple-500 border-purple-500">Interview</Badge>;
      case 'PRACTICE': return <Badge variant="outline" className="text-orange-500 border-orange-500">Practice</Badge>;
      default: return <Badge variant="outline">Task</Badge>;
    }
  };

  const completedTasks = plan.tasks.filter((t: any) => t.isCompleted).length;
  const totalTasks = plan.tasks.length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">Preparation Plan</h2>
        <p className="text-muted-foreground">Your personalized roadmap to crack the <span className="font-semibold">{plan.targetRole}</span> role.</p>
      </div>

      <Card className="border-[#5B2A86]/20 bg-[#5B2A86] text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Plan Progress</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#F58220] transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-3 text-white/80">
            {completedTasks} of {totalTasks} tasks completed. Keep up the good work!
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold mt-8 mb-4">Action Items</h3>
        
        {plan.tasks.map((task: any) => (
          <Card key={task._id} className={`transition-all ${task.isCompleted ? 'bg-gray-50 opacity-75' : ''}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Checkbox 
                    checked={task.isCompleted} 
                    onCheckedChange={(checked) => {
                      updateTaskMutation.mutate({ taskId: task._id, isCompleted: !!checked });
                    }}
                    className="h-6 w-6 rounded-full data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTaskIcon(task.type)}
                      <h4 className={`font-semibold text-lg ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTaskBadge(task.type)}
                      {task.dueDate && (
                        <span className="flex items-center text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded-md">
                          <Calendar className="mr-1 h-3 w-3" />
                          {format(new Date(task.dueDate), 'MMM dd')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm pt-1 ${task.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                    {task.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {plan.tasks.length === 0 && (
          <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            No tasks assigned yet.
          </div>
        )}
      </div>
    </div>
  );
}
