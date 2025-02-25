import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, UserCheck, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardHeaderProps {
  activeGroups: number;
  activeStudents: number;
  totalStudents: number;
  timeRemaining: string;
  participationRate?: number;
}

function DashboardHeader({ 
  activeGroups, 
  activeStudents, 
  totalStudents,
  timeRemaining,
  participationRate = 0
}: DashboardHeaderProps) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
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

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Students</p>
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-2xl font-bold">{activeStudents}</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-gray-500">of {totalStudents}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Currently active students</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
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
      </div>
    </TooltipProvider>
  );
}

export default DashboardHeader;