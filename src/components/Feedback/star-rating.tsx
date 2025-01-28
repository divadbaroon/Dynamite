"use client"

import { useState } from "react"
import { Star as StarIcon } from "lucide-react"

interface StarRatingProps {
  name: string
  onChange: (rating: number) => void
}

export function StarRating({ name, onChange }: StarRatingProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          className={`p-1 transition-colors duration-150
            ${star <= (hover || rating) ? "text-yellow-400" : "text-gray-300"}
            hover:scale-110`}
          onClick={() => {
            setRating(star)
            onChange(star)
          }}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(rating)}
          aria-label={`Rate ${star} stars out of 5`}
        >
          <StarIcon 
            className="w-8 h-8" 
            fill={star <= (hover || rating) ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  )
}