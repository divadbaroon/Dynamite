"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { StarRating } from "@/components/Feedback/star-rating"

interface Ratings {
  usability: number
  content: number
  overall: number
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("")
  const [ratings, setRatings] = useState<Ratings>({
    usability: 0,
    content: 0,
    overall: 0,
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Feedback submitted:", { feedback, ratings })
    setSubmitted(true)
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
                disabled={submitted}
              >
                {submitted ? "Feedback Submitted" : "Submit Feedback"}
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