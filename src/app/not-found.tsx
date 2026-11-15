import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="document-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">404</span>
          <h1>This path is uncharted. / 找不到此頁面。</h1>
          <p>
            <Link className="button" href="/explore">
              Explore the map / 探索地圖
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
