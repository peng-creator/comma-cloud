type MatchInfo = {
  [term: string]: string[];
};

export type SearchResult = {
  /**
   * The document ID
   */
  id: any;
  /**
   * List of terms that matched
   */
  terms: string[];
  /**
   * Score of the search results
   */
  score: number;
  /**
   * Match information, see [[MatchInfo]]
   */
  match: MatchInfo;
  /**
   * Stored fields
   */
  [key: string]: any;
};