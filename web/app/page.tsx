export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  return (
    <div className="p-2">
      <h1 className="font-semibold">pulse</h1>

      <p className="mt-2 font-medium">recent stories</p>
    </div>
  );
}
