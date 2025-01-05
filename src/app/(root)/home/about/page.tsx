import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

const teamMembers = [
  { name: "Yan Chen", role: "Project Manager", image: "/assets/team/pictures/yan_chen.jpg" },
  { name: "Panayu Keelawat", role: "Project Lead", image: "/assets/team/pictures/panayu_keelawat.jpg" },
  { name: "David Barron", role: "Developer", image: "/assets/team/pictures/david_barron.png" },
  { name: "Xi Chen", role: "Developer", image: "/assets/team/pictures/xi_chen.jpg" },
]

export default function TeamPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto"> 
        <h1 className="text-4xl font-bold mb-4">Our team</h1>
        <p className="text-lg mb-8">
          VizPI is a platform developed by a dedicated group of researchers, instructors, student designers, and student
          engineers from institutions like Virginia Tech, University of Virginia, University of Washington, and more, all
          united by a passion for transforming education. Our platform is designed to help instructors conduct dynamic in-
          class coding exercises that engage students in meaningful peer interactions while providing deep insights into
          their cognitive processes and understanding of programming concepts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member) => (
            <Card key={member.name} className="overflow-hidden">
              <CardContent className="p-0">
                <Image
                  src={member.image}
                  alt={`Photo of ${member.name}`}
                  width={400}
                  height={400}
                  className="w-full h-48 object-cover"
                />
              </CardContent>
              <CardHeader className="p-4">
                <CardTitle className="text-lg font-semibold">{member.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}