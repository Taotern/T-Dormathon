-- Drizzle-generated custom migration: derived lexical index, no source data edits.
CREATE VIRTUAL TABLE intel_retrieval_fts USING fts5(title, text, cjk_terms, content='', tokenize='unicode61');
--> statement-breakpoint
CREATE TRIGGER intel_retrieval_documents_insert AFTER INSERT ON intel_retrieval_documents BEGIN
 INSERT INTO intel_retrieval_fts(rowid,title,text,cjk_terms) VALUES(new.sequence,new.title,new.text,new.cjk_terms);
END;
