"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, Copy, Trash2, Users, ChevronDown } from "lucide-react";

export default function GroupDiscussions() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-4">Group Discussions</h1>
        <p className="text-lg mb-8">
          Create, manage, and analyze dynamic group discussions to enhance instructor and student engagement and comprehension.
        </p>
        
        {/* Controls */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              FILTER <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline">
              SORT BY <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            NEW GROUP DISCUSSION
          </Button>
        </div>

        {/* Discussion Cards */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex">
                <div className="w-1/5 p-4 bg-gray-100 flex flex-col justify-center items-center">
                  <Users className="h-8 w-8 text-blue-500 mb-2" />
                  <div className="text-lg font-bold">0 groups</div>
                  <div className="text-sm">0 participants</div>
                </div>
                <div className="w-4/5 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-500 cursor-pointer">
                        Discussion Title
                        <span className="ml-2 inline-flex items-center space-x-1">
                          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                            Live
                          </span>
                        </span>
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Discussion description goes here...
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon">
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400 mt-2">
                    Created on {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No discussions yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first group discussion</p>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              Create Discussion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}