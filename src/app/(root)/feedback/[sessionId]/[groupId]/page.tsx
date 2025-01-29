'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { StarRating } from "@/components/Feedback/star-rating"
import { submitFeedback } from "@/lib/actions/feedback"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import { Ratings } from "@/types"

export default function FeedbackPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const groupId = params.groupId as string
  
  const [feedback, setFeedback] = useState("")
  const [ratings, setRatings] = useState<Ratings>({
    usability: 0,
    content: 0,
    overall: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionId || !groupId) {
      toast.error('Session information is missing')
      return
    }

    if (ratings.usability === 0 || ratings.content === 0 || ratings.overall === 0) {
      toast.error('Please provide all ratings')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitFeedback(null, sessionId, groupId, ratings, feedback)

      if (!result.success) {
        throw new Error(result.error)
      }

      setSubmitted(true)
      toast.success('Thank you for your feedback!')
      
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingChange = (category: keyof Ratings) => (rating: number) => {
    setRatings((prev) => ({ ...prev, [category]: rating }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-4">
          Thank you for your participation!
        </h1>
        <p className="text-center mb-8 text-lg text-gray-600">
          We value your insights! Share your experience with us below
        </p>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Your Feedback</CardTitle>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="usability" className="text-lg">
                  Usability
                </Label>
                <StarRating 
                  name="usability" 
                  onChange={handleRatingChange("usability")} 
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="content" className="text-lg">
                  Educational Value
                </Label>
                <StarRating 
                  name="content" 
                  onChange={handleRatingChange("content")} 
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="overall" className="text-lg">
                  Overall Experience
                </Label>
                <StarRating 
                  name="overall" 
                  onChange={handleRatingChange("overall")} 
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="feedback" className="text-lg">
                  Additional Comments
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Please share your thoughts..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="resize-none"
                  disabled={submitted}
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full text-lg py-6"
                disabled={isSubmitting || submitted}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : submitted ? (
                  "Feedback Submitted"
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {submitted && (
          <p className="text-center text-lg text-green-600 font-medium mt-8">
            Thank you for your feedback!
          </p>
        )}
      </div>
    </div>
  )
}