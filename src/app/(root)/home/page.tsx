import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const Homepage = () => {
  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto"> 
          <h1 className="text-4xl font-bold mb-6">Welcome to EthicConvo</h1>
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="flex-grow">
              <p className="text-lg">
                Our platform EthicConvo is designed to help
                instructors conduct dynamic in-class coding exercises that not only
                engage students in meaningful peer interactions but also provide deep
                insights into their cognitive processes and understanding of programming
                concepts. By facilitating real-time collaboration, discussion, and problem-
                solving among students, these exercises go beyond traditional
                assignments, revealing critical aspects of students&apos; mental models,
                teamwork skills, and learning progress.
              </p>
            </div>
            <Card className="bg-blue-100 flex-shrink-0 w-full md:w-64">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                <h2 className="text-4xl font-bold mb-2">2586</h2>
                <p className="text-lg text-center">Students Engaged in EthicConvo-Powered Sessions</p>
              </CardContent>
            </Card>
          </div>
          <hr className="my-8 border-t border-gray-200" />
          <div className="space-y-6">
            <p className="text-lg">
              In today&apos;s rapidly evolving educational landscape, it&apos;s not enough to rely solely on assignment outcomes to
              gauge student understanding. The rich flow of information generated during peer interactions plays a vital role in
              learning programming, and ultimately, in future software development careers. However, existing tools often fall
              short in capturing and utilizing this data to provide context-aware support.
            </p>
            <p className="text-lg">
              Our platform addresses this gap by continuously monitoring and interpreting students&apos; interactions, giving you,
              the instructor, a clearer picture of where students may be struggling or excelling. This enables you to provide
              targeted feedback and interventions that are both timely and effective, ensuring that your students not only keep
              up with the material but truly master it. By leveraging this tool, you can guide your class more effectively,
              enhance learning outcomes, and prepare your students for the challenges of real-world software development.
            </p>
          </div>
          <hr className="my-8 border-t border-gray-200" />
        </div>
      </main>
    </div>
  );
};

export default Homepage;