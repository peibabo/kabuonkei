import Link from "next/link";

/** カード見出し下に置く「これは何？→」解説記事リンク */
export default function LearnLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="ml-2 text-sky-700 underline underline-offset-2 hover:text-sky-900 whitespace-nowrap"
    >
      これは何？→
    </Link>
  );
}
