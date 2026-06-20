import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch all active and upcoming sales
        const [activeSales, upcomingSales] = await Promise.all([
            base44.asServiceRole.entities.EstateSale.filter({ status: 'active' }),
            base44.asServiceRole.entities.EstateSale.filter({ status: 'upcoming' }),
        ]);

        const allSales = [...(activeSales || []), ...(upcomingSales || [])];
        const now = new Date();

        let completed = 0;
        let skipped = 0;

        for (const sale of allSales) {
            if (!sale.sale_dates || sale.sale_dates.length === 0) {
                skipped++;
                continue;
            }

            // Check if ALL sale dates have passed (end time is in the past)
            const allPast = sale.sale_dates.every(saleDate => {
                const [year, month, day] = saleDate.date.split('-');
                const saleEnd = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(saleDate.end_time?.split(':')[0] ?? 23),
                    parseInt(saleDate.end_time?.split(':')[1] ?? 59)
                );
                return now > saleEnd;
            });

            if (allPast) {
                await base44.asServiceRole.entities.EstateSale.update(sale.id, {
                    status: 'completed',
                });
                completed++;
            } else {
                skipped++;
            }
        }

        return Response.json({
            success: true,
            total_checked: allSales.length,
            completed,
            skipped,
            timestamp: now.toISOString(),
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});