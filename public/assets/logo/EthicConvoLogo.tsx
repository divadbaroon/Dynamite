import React from 'react';

interface EthicConvoProps {
  className?: string;
}

const EthicConvo: React.FC<EthicConvoProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 60"
      className={className}
    >
      <defs>
        <style>
          @import url(&apos;https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap&apos;);
        </style>
      </defs>
      <text
        x="100"
        y="45"
        fontSize="48"
        fontFamily="'Fredoka One', cursive"
        textAnchor="middle"
        fill="currentColor"
      >
        EthicConvo
      </text>
    </svg>
  );
};

export default EthicConvo;