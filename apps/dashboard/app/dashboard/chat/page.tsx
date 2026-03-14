export default function ChatPage() {
  return (
    <div className="flex flex-col h-[80vh] bg-white rounded shadow">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-gray-100 p-2 rounded mb-2 w-fit">Hello! How can I help you today?</div>
        <div className="bg-blue-100 p-2 rounded mb-2 w-fit ml-auto">Show me the top leads.</div>
      </div>
      <div className="p-4 border-t flex">
        <input type="text" placeholder="Type a message..." className="flex-1 border p-2 rounded mr-2" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
      </div>
    </div>
  );
}
