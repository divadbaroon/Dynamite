import { memo } from 'react'
import { Button } from "@/components/ui/button"

interface FooterContentProps {
  timeLeft: number;
  formatTime: (time: number) => string;
  handleReview: () => void;
}

const FooterContentComponent = ({ 
  timeLeft, 
  formatTime, 
  handleReview 
}: FooterContentProps) => (
  <div className="w-full flex justify-between items-center mt-2">
    <p className="text-lg font-semibold">Total Time Left: {formatTime(timeLeft)}</p>
    <Button onClick={handleReview}>Review Answers</Button>
  </div>
);

FooterContentComponent.displayName = 'FooterContent';
export const FooterContent = memo(FooterContentComponent);