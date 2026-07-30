import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import { createCourseCheckout } from "../actions";

export const metadata = { title: "結帳" };

export default async function CourseCheckoutPage({
  params,
  searchParams,
}: {
  params: { courseSlug: string };
  searchParams: { gift?: string };
}) {
  await requireUser(`/checkout/${params.courseSlug}`);
  const course = await prisma.course.findUnique({
    where: { slug: params.courseSlug },
    include: { series: true },
  });
  if (!course || !course.published) notFound();

  const gift = searchParams.gift === "1";
  const courseId = course.id;

  async function submit(giftMessage?: string) {
    "use server";
    return createCourseCheckout(courseId, gift, giftMessage);
  }

  return (
    <div className="px-5 py-16">
      <CheckoutClient
        mode="course"
        gift={gift}
        title={gift ? `送禮:${course.title}` : course.title}
        subtitle={`${course.series.title}·單堂購買,永久觀看`}
        amountTwd={course.priceTwd}
        onSubmit={submit}
      />
    </div>
  );
}
