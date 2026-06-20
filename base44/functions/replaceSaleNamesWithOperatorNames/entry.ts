import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { saleTitle, operatorName, dryRun } = await req.json().catch(() => ({}));

    if (!saleTitle || !operatorName) {
      return Response.json({ 
        error: 'saleTitle and operatorName are required' 
      }, { status: 400 });
    }

    const isDryRun = dryRun !== false; // default to dry run for safety

    // Fetch all blogs
    const blogs = await base44.asServiceRole.entities.SEOPage.filter(
      { page_type: 'blog' }, 
      '-created_date', 
      500
    );

    const results = [];
    let totalReplacements = 0;
    const BATCH_SIZE = 10;
    const blogsToUpdate = [];

    for (const blog of blogs) {
      const fieldsToCheck = ['main_content', 'intro_content', 'h1', 'title', 'meta_description'];
      const changes = {};

      for (const field of fieldsToCheck) {
        const content = blog[field];
        if (content && typeof content === 'string' && content.includes(saleTitle)) {
          const newContent = content.split(saleTitle).join(operatorName);
          if (newContent !== content) {
            changes[field] = newContent;
          }
        }
      }

      // Also check faq_json
      if (blog.faq_json && Array.isArray(blog.faq_json)) {
        const faqStr = JSON.stringify(blog.faq_json);
        if (faqStr.includes(saleTitle)) {
          const newFaqStr = faqStr.split(saleTitle).join(operatorName);
          changes.faq_json = JSON.parse(newFaqStr);
        }
      }

      if (Object.keys(changes).length > 0) {
        blogsToUpdate.push({ id: blog.id, title: blog.title, changes });
      }
    }

    if (!isDryRun) {
      // Process in batches to avoid rate limiting
      for (let i = 0; i < blogsToUpdate.length; i += BATCH_SIZE) {
        const batch = blogsToUpdate.slice(i, i + BATCH_SIZE);
        for (const b of batch) {
          await base44.asServiceRole.entities.SEOPage.update(b.id, b.changes);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        // Delay between batches to avoid rate limits
        if (i + BATCH_SIZE < blogsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    for (const b of blogsToUpdate) {
      const replacementCount = JSON.stringify(b.changes).split(operatorName).length - 1;
      totalReplacements += replacementCount;
      results.push({ id: b.id, title: b.title, changedFields: Object.keys(b.changes) });
    }

    return Response.json({
      success: true,
      dryRun: isDryRun,
      saleTitle,
      operatorName,
      totalBlogs: blogs.length,
      blogsUpdated: results.length,
      totalReplacements,
      results: results.slice(0, 20) // first 20 for preview
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});