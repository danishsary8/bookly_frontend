import React from "react";

const Loading: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-t-transparent border-orange-500 rounded-full animate-spin" />
      <p className="mt-3 text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
};

export default Loading;
