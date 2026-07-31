// 課程 新增/編輯 共用表單(server component,action 由頁面傳入)。

import type { Course } from "@prisma/client";

export function CourseForm({
  action,
  course,
  seriesOptions,
}: {
  action: (formData: FormData) => Promise<void>;
  course?: Course;
  seriesOptions: { id: string; title: string }[];
}) {
  return (
    <form action={action} className="card mt-8 max-w-2xl space-y-6 p-8">
      {course && <input type="hidden" name="id" value={course.id} />}

      <div>
        <label className="mb-1.5 block text-xs text-inkdim" htmlFor="title">
          標題
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={course?.title}
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
          defaultValue={course?.slug}
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
          defaultValue={course?.description}
          className="input"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs text-inkdim" htmlFor="seriesId">
            所屬系列
          </label>
          <select
            id="seriesId"
            name="seriesId"
            required
            defaultValue={course?.seriesId ?? ""}
            className="input"
          >
            <option value="" disabled>
              請選擇系列
            </option>
            {seriesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-inkdim" htmlFor="priceTwd">
            單購價(NT$)
          </label>
          <input
            id="priceTwd"
            name="priceTwd"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={course?.priceTwd ?? ""}
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
            defaultValue={course?.sortOrder ?? 0}
            className="input num"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={course?.published ?? false}
          className="h-4 w-4 accent-[#b79a63]"
        />
        上架(前台可見)
      </label>

      <div className="pt-2">
        <button type="submit" className="btn-primary">
          {course ? "儲存變更" : "建立課程"}
        </button>
      </div>
    </form>
  );
}
