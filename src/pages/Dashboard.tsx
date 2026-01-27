import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Briefcase, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      return await dashboardAPI.getSummary();
    },
  });

  const statusConfig = {
    saved: { label: 'Saved', icon: FileText, color: 'bg-blue-100 text-blue-800' },
    applied: { label: 'Applied', icon: Briefcase, color: 'bg-purple-100 text-purple-800' },
    oa: { label: 'Online Assessment', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    interview: { label: 'Interview', icon: Calendar, color: 'bg-orange-100 text-orange-800' },
    offer: { label: 'Offer', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-800' },
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.email}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.total || 0}</div>
            </CardContent>
          </Card>

          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = summary?.by_status?.[status] || 0;
            
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {summary?.upcoming_interviews && summary.upcoming_interviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.upcoming_interviews.map((interview: any) => (
                  <div key={interview.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <p className="font-medium">{interview.company}</p>
                      <p className="text-sm text-muted-foreground">{interview.role}</p>
                    </div>
                    <Badge variant="outline">
                      {new Date(interview.next_interview_date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;