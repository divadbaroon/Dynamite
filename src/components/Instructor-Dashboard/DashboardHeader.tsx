import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, UserCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardHeaderProps {
  activeGroups: number;
  activeStudents: number;
  totalStudents?: number; // New prop for total students
  timeRemaining: string;
}

function DashboardHeader({ 
  activeGroups, 
  activeStudents, 
  totalStudents,
  timeRemaining 
}: DashboardHeaderProps) {
  
  // Calculate student participation percentage
  const participationRate = totalStudents 
    ? Math.round((activeStudents / totalStudents) * 100) 
    : null;
  
  return (
    <div className="flex space-x-6">
      <TooltipProvider>
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Groups</p>
                <h3 className="text-2xl font-bold">{activeGroups}</h3>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Students</p>
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-2xl font-bold">{totalStudents}</h3>
                 
                </div>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Time Remaining</p>
                <h3 className="text-2xl font-bold">{timeRemaining}</h3>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}

export default DashboardHeader;