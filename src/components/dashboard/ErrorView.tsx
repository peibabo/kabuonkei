export default function ErrorView({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-red-600">
        <p className="text-xl font-bold mb-2">エラー</p>
        <p>{message}</p>
      </div>
    </div>
  );
}
