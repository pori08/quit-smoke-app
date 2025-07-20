/* ここからコピー */

"use client"

import { useState, useEffect } from "react"
import { db } from "./firebase"
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, where, deleteDoc } from "firebase/firestore"
import dayjs from "dayjs"
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { CheckCircleIcon, FireIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

dayjs.extend(isSameOrBefore)

async function fetchStreak(setStreak, setMoney, price) {
  const q = query(collection(db, 'records'), orderBy('__name__', 'desc'))
  const snap = await getDocs(q)
  const map = new Map()
  snap.forEach(d => map.set(d.id, d.data().success))
  let count = 0
  let cur = dayjs()
  while (map.get(cur.format('YYYY-MM-DD')) === true) {
    count++; cur = cur.subtract(1, 'day')
  }
  setStreak(count)
  setMoney(count * price)
}

export default function Dashboard() {
  const [quitDate, setQuitDate] = useState<string>("")
  const [streak,  setStreak]    = useState<number>(0)
  const [money,   setMoney]     = useState<number>(0)
  const [price,   setPrice]     = useState<number>(600)
  const [smoked,  setSmoked]    = useState<boolean | null>(null)

  // ★ 最初に Firestore から各種設定と今日の喫煙状況を読み込む
  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "userConfig", "default")
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setQuitDate(data.quitDate || "")
        setPrice(data.price || 600)
      }

      const today = dayjs().format("YYYY-MM-DD")
      const recordRef = doc(db, "records", today)
      const recordSnap = await getDoc(recordRef)
      if (recordSnap.exists()) {
        setSmoked(recordSnap.data().success === false)
      } else {
        setSmoked(null)
      }
    }
    load()
  }, [])

  // ★ quitDate が変わるたび Streak を計算
  useEffect(() => {
    if (!quitDate) return
    fetchStreak(setStreak, setMoney, price)
  }, [quitDate, price])

  // ★ カレンダー変更 → Firestore に保存
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuitDate(val)
    await setDoc(doc(db, "userConfig", "default"), { quitDate: val }, { merge: true })

    // 禁煙開始日以降の記録を削除
    const q = query(collection(db, 'records'), where('__name__', '>=', val))
    const snap = await getDocs(q)
    snap.forEach(async (d) => {
      await deleteDoc(doc(db, 'records', d.id))
    })

    await fetchStreak(setStreak, setMoney, price)
  }

  // ★ 価格変更 → Firestore に保存
  const handlePriceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = Number(e.target.value)
    setPrice(newPrice)
    await setDoc(doc(db, "userConfig", "default"), { price: newPrice }, { merge: true })
  }

  // ★ 喫煙状況を Firestore に保存
  const handleSmoke = async (smoked: boolean) => {
    const today = dayjs().format("YYYY-MM-DD")
    await setDoc(doc(db, "records", today), { success: !smoked }, { merge: true })
    setSmoked(smoked)
    if (smoked) {
      toast.error('深呼吸して落ち着こう')
    } else {
      toast.success('記録しました！')
    }
    await fetchStreak(setStreak, setMoney, price)
  }

  return (
    <main className="p-4 space-y-6 bg-gradient-to-b from-gray-200 to-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">禁煙ダッシュボード</h1>

      {/* Settings */}
      <div className="space-y-4">
        <section className="bg-white shadow p-4 rounded-2xl">
          <label className="block text-sm mb-1">禁煙開始日</label>
          <p className="text-xs text-gray-500 mb-2">禁煙を始めた日付を設定します。</p>
          <input
            type="date"
            value={quitDate}
            onChange={handleChange}
            max={dayjs().format("YYYY-MM-DD")}
            className="border px-2 py-1 rounded w-full"
          />
        </section>
        <section className="bg-white shadow p-4 rounded-2xl">
          <label className="block text-sm mb-1">タバコ一箱の価格 (円)</label>
          <p className="text-xs text-gray-500 mb-2">節約金額の計算に使用します。</p>
          <input
            type="number"
            value={price}
            onChange={handlePriceChange}
            className="border px-2 py-1 rounded w-full"
          />
        </section>
      </div>

      {/* Streak & Money */}
      <div className="flex flex-col md:flex-row gap-4">
        <section className="flex-1 bg-white shadow p-4 rounded-2xl">
          <label className="block text-sm">継続日数</label>
          <p className="text-xs text-gray-500 mb-2">禁煙が継続している日数です。</p>
          <p className="text-4xl font-bold">{streak} days</p>
        </section>
        <section className="flex-1 bg-white shadow p-4 rounded-2xl">
          <label className="block text-sm">節約金額</label>
          <p className="text-xs text-gray-500 mb-2">禁煙によって節約できた金額です。</p>
          <p className="text-4xl font-bold">¥{money.toLocaleString()}</p>
        </section>
      </div>
    {/* Action Buttons */}
      <div className="flex justify-center gap-6 pt-8">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="notSmoked"
            checked={smoked === false}
            onChange={() => handleSmoke(false)}
            className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="notSmoked" className="ml-2 text-lg">
            今日吸わなかった
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="smoked"
            checked={smoked === true}
            onChange={() => handleSmoke(true)}
            className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label htmlFor="smoked" className="ml-2 text-lg">
            吸ってしまった
          </label>
        </div>
      </div>
</main>
  )
}

/* ここまでコピー */
