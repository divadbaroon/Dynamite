import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function JoinUs() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8"> 
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Interested in Joining VizPI?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We are looking for passionate researchers to join our team and help us expand our knowledge and research
              capabilities. Below you will find more information on how you can contribute and be a part of our growing
              community.
            </p>
            <p>
              If you have any questions or want to apply, please write us an email at{" "}
              <a href="mailto:info@VizPI.org" className="text-primary hover:underline">
                info@VizPI.org
              </a>
              .
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Opportunities for Researchers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Collaborate on Existing Projects:</h3>
              <p>
                We are always looking for experts to help us with ongoing studies. Your expertise can help us gain deeper
                insights and improve the quality of our research.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Lead New Research Initiatives:</h3>
              <p>
                If you have an idea for a study that aligns with our mission, we would love to support you in bringing it
                to life. We provide the resources and platform you need to conduct meaningful research.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Mentor Young Researchers:</h3>
              <p>
                Share your knowledge and experience with the next generation of scientists. Mentorship opportunities are
                available for experienced researchers willing to guide students and junior researchers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}