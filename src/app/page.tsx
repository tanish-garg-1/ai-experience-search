import { SearchApp } from "@/components/SearchApp";
import { aiEnabled } from "@/lib/aiParse";
import { paramsToFilters } from "@/lib/filters";

export default async function Home({ searchParams }: PageProps<"/">) {
  const initialFilters = paramsToFilters(await searchParams);
  return <SearchApp initialFilters={initialFilters} aiEnabled={aiEnabled()} />;
}
