import express from "express";
const router = express.Router();
import { Difficulty, PrismaClient } from "@prisma/client";
import { verifytoken } from "../middlewares/authmiddleware.js";
import { date } from "zod";

const prisma = new PrismaClient();

router.get("/courses", verifytoken, async (req, res, next) => {
    const userid = req.userid;

    try {
        const userWithCourses = await prisma.user.findMany({
            where: {
                id: userid,
            },
            select: {
                courses: {
                    select: {
                        title: true,
                        description: true,
                        difficulty:true,
                        durationDays: true,
                    },
                },
            },
        });

        if (!userWithCourses) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json(userWithCourses);
    } catch (error) {
        next(error); 
    }
});
router.get('/courses/:id/modules',verifytoken,async(req,res,next)=>{
    const userid = req.userid;
    const courseid = req.params.id
    try{
        const allmodules = await prisma.course.findMany({
            where:{
                userId:userid,
                id:courseid
            },
            select:{
                title:true,
                description:true,
                    modules:{
                        select:{
                            title:true
                        }
                    }

            }
        })
        if(!allmodules){
            return res.status(401).json({
                message:"not there"
            })
        }
        else{
            return res.status(200).json({
                allmodules
            })
        }
    }
    catch(err){
        console.log(err)
    }
})


router.get('/courses/modules/:moduleId/lessons', verifytoken, async (req, res, next) => {
  const { courseId, moduleId } = req.params;
  const userId = req.userid;

  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        moduleId: moduleId,
      },
    });

    return res.json({ lessons });
  } catch (error) {
    next(error);
  }
});



export default router;
