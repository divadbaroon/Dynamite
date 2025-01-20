"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, Trash2, Users, ChevronDown } from "lucide-react";
import { getAllSessions, deleteSession } from "@/lib/actions/session";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Session } from "@/types"

export default function GroupDiscussions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { sessions, error } = await getAllSessions();
      if (error) throw error;
      setSessions(sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await deleteSession(sessionToDelete);
      if (error) throw error;
      
      // Remove the session from local state
      setSessions(sessions.filter(session => session.id !== sessionToDelete));
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const handleNewDiscussion = () => {
    router.push('/session/create');
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/session/${sessionId}`);
  };  

  const abbreviateDescription = (description?: string | null, maxLength: number = 194) => {
    if (!description) return '';
    return description.length > maxLength ? 
      `${description.substring(0, maxLength)}...` : 
      description;
  };

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
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleNewDiscussion}
          >
            NEW GROUP DISCUSSION
          </Button>
        </div>

        {/* Discussion Cards */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <Card key={session.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-1/5 p-4 bg-gray-100 flex flex-col justify-center items-center">
                      <Users className="h-8 w-8 text-blue-500 mb-2" />
                      <div className="text-lg font-bold">{session.group_count} groups</div>
                      <div className="text-sm">{session.participant_count} participants</div>
                    </div>
                    <div className="w-4/5 p-4">
                      <div className="flex justify-between items-start">
                      <div 
                          onClick={() => handleSessionClick(session.id)}
                          className="cursor-pointer group"
                        >
                          <h3 className="text-lg font-semibold text-blue-500 group-hover:text-blue-600">
                            {session.title}
                            <span className="ml-2 inline-flex items-center space-x-1">
                              <span className={`${
                                session.status 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-yellow-100 text-yellow-700"
                              } text-xs font-semibold px-2 py-1 rounded-full`}>
                                {session.status ? "Live" : "Inactive"}
                              </span>
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {abbreviateDescription(session.task)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon">
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(session.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-400 mt-2">
                        Created on {new Date(session.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No discussions yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first group discussion</p>
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleNewDiscussion}
              >
                Create Discussion
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the session
                and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-500 hover:bg-red-600 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}