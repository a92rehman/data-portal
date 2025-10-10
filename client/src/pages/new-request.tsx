import DataRequestForm from "@/components/DataRequestForm";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";

export default function NewRequest() {
  const { user } = useAuth();
  
  // Empty handler as we're already on the new request page
  const handleNewRequest = () => {};
  
  return (
    <div className="h-screen flex flex-col bg-background dark:bg-gray-900">
      <Header user={user as any} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onNewRequest={handleNewRequest} user={user as any} />
        <main className="flex-1 overflow-y-auto">
          <DataRequestForm />
        </main>
      </div>
    </div>
  );
}
