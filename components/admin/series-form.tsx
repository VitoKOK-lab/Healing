// 系列 新增/編輯 共用表單(server component,action 由頁面傳入)。

import type { Series } from "@prisma/client";
import { SERIES_CATEGORIES, SERIES_CATEGORY_LABEL } from "@/lib/types";

export function SeriesForm({
  action,
  series,
}: {
  action: (formData: FormData) => Promise<void>;
  series?: Series;
}) {
  return (
    <form action={action} className="card mt-8 max-w-2xl space-y-6 p-8">
      {series && <input type="hidden" name="id" value={series.id} />}

      <div>
        <label className="mb-1.5 block text-xs text-inkdim" htmlFor="title">
          標題
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={series?.title}
          className="input"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-inkdim" htmlFor="slug">
          Slug(網址代稱,小寫英數與連字號)
        </label>
        <input
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={series?.slug}
          className="input num"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-inkdim" htmlFor="description">
          描述
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={series?.description}
          className="input"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs text-inkdim" htmlFor="category">
            分類
          </label>
          <select
            id="category"
            name="category"
            defaultValue={series?.category ?? SERIES_CATEGORIES[0]}
            className="input"
          >
            {SERIES_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SERIES_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-inkdim" htmlFor="monthlyPriceTwd">
            月費(NT$,留空 = 不開放訂閱)
          </label>
          <input
            id="monthlyPriceTwd"
            name="monthlyPriceTwd"
            type="number"
            min={1}
            step={1}
            defaultValue={series?.monthlyPriceTwd ?? ""}
            className="input num"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-inkdim" htmlFor="sortOrder">
            排序(小到大)
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            step={1}
            defaultValue={series?.sortOrder ?? 0}
            className="input num"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={series?.published ?? false}
          className="h-4 w-4 accent-[#b79a63]"
        />
        上架(前台可見)
      </label>

      <div className="pt-2">
        <button type="submit" className="btn-primary">
          {series ? "儲存變更" : "建立系列"}
        </button>
      </div>
    </form>
  );
}
