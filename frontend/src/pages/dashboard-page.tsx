import { useEffect } from "react";
import { getStudents } from "@/services/students.service";

export function DashboardPage() {
  useEffect(() => {
    getStudents()
      .then(console.log)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Dashboard
      </h1>
    </div>
  );
}