import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { matchAPI } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

const ResumeMatch = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState<any>(null);

  const matchMutation = useMutation({
    mutationFn: async () => {
      return await matchAPI.analyze(resumeText, jobText);
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: 'Analysis Complete',
        description: `Match score: ${data.score}%`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to analyze resume match',
        variant: 'destructive',
      });
    },
  });

  const handleAnalyze = () => {
    if (!resumeText || !jobText) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both resume and job description',
        variant: 'destructive',
      });
      return;
    }
    matchMutation.mutate();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Resume Match</h1>
          <p className="text-muted-foreground">
            Analyze how well your resume matches a job description
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your resume text here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="min-h-[300px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the job description here..."
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                className="min-h-[300px]"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleAnalyze}
            disabled={matchMutation.isPending}
            size="lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {matchMutation.isPending ? 'Analyzing...' : 'Analyze Match'}
          </Button>
        </div>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}%
                </div>
                <p className="text-muted-foreground mt-2">Match Score</p>
              </div>

              {result.overlap_keywords && result.overlap_keywords.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Matching Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.overlap_keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.missing_keywords && result.missing_keywords.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Missing Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.tips && result.tips.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Improvement Tips</h3>
                  <ul className="space-y-2">
                    {result.tips.map((tip: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ResumeMatch;