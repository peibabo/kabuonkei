export default function DashboardFooter() {
  return (
    <footer className="text-center text-xs text-gray-400 mt-12 py-6 border-t border-gray-200">
      <p className="mb-2">
        当サイトは投資助言を行うものではありません。過去の統計・類似日のリターンは過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身の責任でお願いします。
      </p>
      <p>
        データソース: CNN Business, Yahoo Finance, JPX |{" "}
        &copy; {new Date().getFullYear()} 株温計
      </p>
    </footer>
  );
}
