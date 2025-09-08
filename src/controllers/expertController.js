import { ApiResponse } from '../utils/ApiResponse.js';
import Expert from '../models/expertModel.js';
import Otp from '../models/otpModel.js';
import Masterclass from '../models/masterClassModel.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/userModel.js';
import PendingUser from '../models/pendingUserModel.js';
import moment from "moment";
import jwt from "jsonwebtoken"
import SuperAdmin from '../models/superAdminModel.js';
import Artist from '../models/artistModel.js'
import Employee from '../models/employeeModel.js';

const JWT_SECRET = process.env.JWT_SECRET;


export const postMasterclass = async (req, res) => {
    try {
        const { title, tags,video } = req.body;
        const expertId = req.user.id;
        if (!title || !tags || !video) {
            return res.status(200).json(new ApiResponse(400, null, 'Title, video link and content are required.'));
        }
        const expert = await Expert.findOne({ user: expertId })
        const newMasterclass = new Masterclass({
            expert: expert._id,
            title,
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
            video
        });

        const savedMasterclass = await newMasterclass.save();

        await Expert.findOneAndUpdate(
            { user: expertId },
            { $push: { masterclasses: savedMasterclass._id } },
            { new: true, runValidators: true }
        );

        res.status(201).json(
            new ApiResponse(201, {
                masterclass: savedMasterclass
            }, 'Masterclass created successfully')
        );
    } catch (error) {
        console.error('Error in postMasterclass:', error);
        res.status(error.statusCode || 500).json(
            new ApiError(error.statusCode || 500, error.message)
        );
    }
};

export const editMasterclass = async (req, res) => {
    try {
        const classId = req.params.classId;
        const updates = {};
        const allowedUpdates = ['title', 'tags'];

        if (!classId) return res.status(200).json(new ApiResponse(400, null, "Masterclass id is required"));

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedClass = await Masterclass.findByIdAndUpdate(classId, updates, {
            new: true,
            runValidators: true
        });

        if (!updatedClass) {
            return res.status(200).json(new ApiResponse(400, null, "Materclass not updated"));
        }

        return res.status(200).json(new ApiResponse(200, updatedClass, "Masterclass updated successfully"));
    } catch (error) {
        console.error('Error updating masterclass:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
}

export const deleteMasterClass = async (req, res) => {
    try {
        let expert = null;

        if (req.user.role !== "superAdmin") {
            const userId = req.user.id;
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }

        const classId = req.params.classId;

        if (!classId) {
            return res.status(400).json(new ApiResponse(400, null, "Masterclass ID is required"));
        }

        const deleteClass = await Masterclass.findByIdAndDelete(classId);

        if (!deleteClass) {
            return res.status(400).json(new ApiResponse(400, null, "Masterclass not deleted"));
        }

        await Expert.updateOne(
            { _id: expert._id },
            { $pull: { masterclasses: classId } }
        );

        return res.status(200).json(new ApiResponse(200, null, "Masterclass deleted successfully"));
    } catch (error) {
        console.error("Error deleting masterclass:", error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const verifyExpertEmail = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(200).json(new ApiResponse(400, null, "Email and OTP are required"));
    }

    try {
        const user = await User.findOne({ email });

        if (user) {
            const pendingOtp = await Otp.findOne({ email });

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingOtp.otpExpiration);
            if (String(otp) !== String(pendingOtp.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, null, "Invalid or expired OTP"));
            }

            await Otp.findOneAndDelete({ email })

            const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(200, user, "Login successful"));
        } else {
            const pendingUser = await PendingUser.findOne({ email });
            console.log(pendingUser);
            if (!pendingUser) {
                return res.status(200).json(new ApiResponse(400, null, "Pending registration not found"));
            }

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingUser.otpExpiration);

            if (String(otp) !== String(pendingUser.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, null, "Invalid or expired OTP"));
            }
            const userRole = pendingUser.role;
            const newUser = new User({
                name: pendingUser.name,
                email: pendingUser.email,
                password: pendingUser.password,
                role: userRole,
                profilePicture: pendingUser.profilePicture,
            });

            await newUser.save();

            if (userRole == "expert") {
                const newExpert = new Expert({
                    user: newUser._id
                });

                await newExpert.save();
            } else if (userRole == "superAdmin") {
                const newAdmin = new SuperAdmin({
                    user: newUser._id
                });

                await newAdmin.save()
            } else if (userRole == "artist") {
                const newArtist = new Artist({
                    user: newUser._id
                });

                await newArtist.save()
            } else if (userRole == "employee") {
                const newEmployee = new Employee({
                    user: newUser._id
                });

                await newEmployee.save()
            }

            await PendingUser.deleteOne({ email });

            const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(201, newUser, `${userRole} registered and logged in successfully`));
        }

    } catch (error) {
        console.error('Error in OTP verification and user processing:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const verifyExpertNumber = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(200).json(new ApiResponse(400, "PhoneNumber and OTP are required"));
    }

    try {
        const user = await User.findOne({ phoneNumber });

        if (user) {
            const pendingOtp = await Otp.findOne({ phoneNumber });

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingOtp.otpExpiration);
            if (String(otp) !== String(pendingOtp.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, null, "Invalid or expired OTP"));
            }

            await Otp.findOneAndDelete({ phoneNumber })

            const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(200, user, "Login successful"));
        } else {
            const pendingUser = await PendingUser.findOne({ phoneNumber });

            if (!pendingUser) {
                return res.status(200).json(new ApiResponse(400, null, "Pending registration not found"));
            }

            const currentTime = new Date();
            const otpExpirationDate = new Date(pendingUser.otpExpiration);

            if (String(otp) !== String(pendingUser.otp) || currentTime.getTime() > otpExpirationDate.getTime()) {
                return res.status(200).json(new ApiResponse(400, null, "Invalid or expired OTP"));
            }

         
            const userRole = pendingUser.role;

            const newUser = new User({
                name: pendingUser.name,
                phoneNumber: pendingUser.phoneNumber,
                password: pendingUser.password,
                profilePicture: pendingUser.profilePicture,
                role: userRole
            });

            await newUser.save();


            if (userRole == "expert") {
                const newExpert = new Expert({
                    user: newUser._id
                });

                await newExpert.save();
            } else if (userRole == "superAdmin") {
                const newAdmin = new SuperAdmin({
                    user: newUser._id
                });

                await newAdmin.save()
            } else if (userRole == "artist") {
                const newArtist = new Artist({
                    user: newUser._id
                });

                await newArtist.save()
            }else if (userRole == "employee") {
                const newEmployee = new Employee({
                    user: newUser._id
                });

                await newEmployee.save()
            }


            await PendingUser.deleteOne({ phoneNumber });

            const token = jwt.sign({ id: newUser._id.toString() }, JWT_SECRET, { expiresIn: "12h" });
            res.cookie("token", token, { httpOnly: true });

            return res.json(new ApiResponse(201, newUser, `${userRole} registered and logged in successfully`));
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const updateExpertProfile = async (req, res) => {
    try {
        let expert = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }
        console.log(expert)
        let updatedUser = null;
        let updatedExpert = null;
        const userUpdates = {};
        const expertUpdates = {};
        const userAllowedUpdates = ['name', 'profileName', 'age', 'gender', 'email', 'phone'];
        const expertAllowedUpdates = ['expertise', 'topRated', 'expertTag'];

        userAllowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                userUpdates[field] = req.body[field];
            }
        });

        expertAllowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                expertUpdates[field] = req.body[field];
            }
        });

        if (!expert) {
            return res.status(200).json(new ApiResponse(404, null, "Expert not found"));
        }

        if (Object.keys(userUpdates).length > 0) {
            const userId = expert.user.toString();
            updatedUser = await User.findByIdAndUpdate(userId, userUpdates, {
                new: true,
                runValidators: true
            });

            if (!updatedUser) {
                return res.status(200).json(new ApiResponse(400, null, "User not found"));
            }
        }

        if (Object.keys(expertUpdates).length > 0) {
            updatedExpert = await Expert.findByIdAndUpdate(expert._id, expertUpdates, {
                new: true,
                runValidators: true
            });
        }

        return res.status(200).json(new ApiResponse(200, updatedExpert, updatedUser, "Expert Profile updated successfully"));
    } catch (error) {
        console.error('Error updating profile:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};


export const trackMasterclassView = async (req, res) => {
    try {
        const { masterclassId } = req.body;
        const userId = req.user.id;

        const masterclass = await Masterclass.findById(masterclassId)
            .populate({
                path: 'expert',
                populate: {
                    path: 'user',
                    model: 'User'
                }
            });

        if (!masterclass) {
            return res.status(200).json(new ApiResponse(400, null, 'Masterclass not found'));
        }

        if (masterclass.expert.user._id.toString() === userId.toString()) {
            return res.status(200).json(new ApiResponse(400, null, 'Creator cannot be counted as a viewer'));
        }

        const alreadyViewed = masterclass.viewedBy.includes(userId);

        if (!alreadyViewed) {
            masterclass.viewedBy.push(userId);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!masterclass.views.length) {
                masterclass.views = [
                    { count: 1 },
                    { dateViewed: today }
                ];
            } else {
                masterclass.views = [
                    { count: (masterclass.views[0]?.count || 0) + 1 },
                    { dateViewed: today }
                ];
            }

            console.log('Before save - views array:', masterclass.views);

            const updatedMasterclass = await masterclass.save();

            console.log('After save - views array:', updatedMasterclass.views);

            return res.status(200).json(new ApiResponse(200, {
                totalViews: updatedMasterclass.views[0].count,
                viewDate: updatedMasterclass.views[1].dateViewed
            }, 'View tracked successfully'));
        }
        return res.status(200).json(new ApiResponse(200, {
            totalViews: masterclass.views[0]?.count || 0
        }, 'Already viewed by this user'));

    } catch (error) {
        console.error('Error tracking masterclass view:', error);
        throw new ApiError(500, "Error tracking masterclass view", [error.message]);
    }
};

export const getMasterclassViews = async (req, res) => {
    try {
        const { masterclassId } = req.body;

        const masterclass = await Masterclass.findById(masterclassId)
            .populate('viewedBy', 'name email');

        if (!masterclass) {
            return res.status(200).json(new ApiResponse(400, null, 'Masterclass not found'));
        }
        return res.status(200).json(new ApiResponse(200, {
            totalViews: masterclass.views[0]?.count || 0,
            lastViewDate: masterclass.views[1]?.dateViewed,
            uniqueViewers: masterclass.viewedBy.length,
            viewers: masterclass.viewedBy
        }, 'View tracked successfully'));


    } catch (error) {
        console.error('Error fetching view statistics:', error);
        throw new ApiError(500, "Error fetching view statistics", [error.message]);
    }
};

export const deleteExpertProfile = async (req, res) => {
    try {
        let expert = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }

        const deleteExpert = await Expert.findByIdAndDelete(expert._id);

        if (!deleteExpert) {
            return res.status(200).json(new ApiResponse(404, null, "User not found in the specified role"));
        }

        const deleteUser = await User.findByIdAndDelete(expert.user.toString());

        if (!deleteUser) {
            return res.status(200).json(new ApiResponse(404, null, "User not found"));
        }

        return res.status(200).json(new ApiResponse(200, "User deleted successfully"));
    } catch (error) {
        console.error('Error deleting profile:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};

export const deleteArtistProfile = async (req, res) => {
    try {
        let artist = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            artist = await Artist.findOne({ user: userId });
        } else {
            const artistId = req.params.artistId;
            artist = await Artist.findById(artistId);
        }

        const deleteArtist = await Artist.findByIdAndDelete(artist._id);

        if (!deleteArtist) {
            return res.status(200).json(new ApiResponse(404, null, "User not found in the specified role"));
        }

        const deleteUser = await User.findByIdAndDelete(artist.user.toString());

        if (!deleteUser) {
            return res.status(200).json(new ApiResponse(404, null, "User not found"));
        }

        return res.status(200).json(new ApiResponse(200, "User deleted successfully"));
    } catch (error) {
        console.error('Error deleting profile:', error);
        throw new ApiError(500, "Internal server error", [error.message]);
    }
};
// about us 
export const updateAbout = async (req, res) => {
    try {
        let expert = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }
        const { about } = req.body;

        expert.about = about

        res.status(200).json(new ApiResponse(200, { about: expert.about }, 'About section updated successfully'));
    } catch (error) {
        console.error('Error in updateAbout:', error);
        res.status(500).json(new ApiError(500, 'Failed to update about section'));
    }
};

// Education 
export const addEducation = async (req, res) => {
    try {
        const { school, degree, startyr, endyr } = req.body;
        const expertId = req.user.id;

        const expert = await Expert.findOne({ user: expertId });
        if (!expert) {
            return res.status(404).json(new ApiResponse(404, null, 'Expert not found.'));
        }

        expert.education.push({ school, degree, startyr, endyr });
        await expert.save();

        res.status(201).json(new ApiResponse(201, expert.education, 'Education added successfully'));
    } catch (error) {
        console.error('Error in addEducation:', error);
        res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
};
export const editEducation = async (req, res) => {
    try {
        let expert = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }
        console.log(expert)
        const educationId = req.params.educationId
        // const { school, degree, startyr, endyr } = req.body;
        const updateData = req.body;
        if (!expert) {
            return res.status(404).json(new ApiResponse(404, null, 'Expert not found.'));
        }

        // Find the specific education entry by ID
        const education = expert.education.id(req.params.educationId);
        if (!education) {
            return res.status(404).json(new ApiResponse(404, null, 'Education entry not found.'));
        }

        // Update fields if provided
        // if (school !== undefined) education.school = school;
        // if (degree !== undefined) education.degree = degree;
        // if (startyr !== undefined) education.startyr = startyr;
        // if (endyr !== undefined) education.endyr = endyr;
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                education[key] = updateData[key]; // Update only if the field is defined
            }
        });
        await expert.save();
        res.status(200).json(new ApiResponse(200, expert.education, 'Education updated successfully'));
    } catch (error) {
        console.error('Error in editEducation:', error);
        res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
};

export const deleteEducation = async (req, res) => {
    try {
        let expert = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }
        console.log(expert)
        const educationId = req.params.educationId

        if (!expert) {
            return res.status(404).json(new ApiResponse(404, null, 'Expert not found.'));
        }

        const education = expert.education.map((m) => m._id == educationId);
        console.log(education);
        if (!education) {
            return res.status(404).json(new ApiResponse(404, null, 'Education entry not found.'));
        }

        expert.education.pull({ _id: educationId });
        await expert.save();

        res.status(200).json(new ApiResponse(200, expert.education, 'Education deleted successfully'));
    } catch (error) {
        console.error('Error in deleteEducation:', error);
        res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
};
// certication 
export const addCertification = async (req, res) => {
    try {
        const { title,imageUrl } = req.body;
        const expertId = req.user.id;

        if (!title || !imageUrl) {
            return res.status(400).json(new ApiResponse(400, null, 'title and image url are required'));
        }

        const expert = await Expert.findOne({ user: expertId });
        if (!expert) {
            return res.status(404).json(new ApiResponse(404, null, 'Expert not found.'));
        }

        expert.certification.push({
            title,
            image: imageUrl,
        });
        await expert.save();

        res.status(201).json(new ApiResponse(201, expert.certification, 'Certification added successfully'));
    } catch (error) {
        console.error('Error in addCertification:', error);
        res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
};
export const editCertification = async (req, res) => {
    try {
        let expert = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }
        const certificationId = req.params.certificationId
        const { title } = req.body;

        if (!expert) {
            return res.status(404).json(new ApiResponse(404, null, 'Expert not found.'));
        }

        const certification = expert.certification.id(req.params.certificationId);
        if (!certification) {
            return res.status(404).json(new ApiResponse(404, null, 'Certification entry not found.'));
        }

        certification.title = title || certification.title;

        // Update image if a new file is uploaded
        if (req.body.imageUrl) {
            
            certification.image = req.body.imageUrl;
        }

        await expert.save();
        res.status(200).json(new ApiResponse(200, expert.certification, 'Certification updated successfully'));
    } catch (error) {
        console.error('Error in editCertification:', error);
        res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
};
export const deleteCertification = async (req, res) => {
    try {
        let expert = null;
        if (req.user.role !== "superAdmin") {
            const userId = req.user.id
            expert = await Expert.findOne({ user: userId });
        } else {
            const expertId = req.params.expertId;
            expert = await Expert.findById(expertId);
        }
        const certificationId = req.params.certificationId

        if (!expert) {
            return res.status(404).json(new ApiResponse(404, null, 'Expert not found.'));
        }

        const certification = expert.certification.id(certificationId);
        if (!certification) {
            return res.status(404).json(new ApiResponse(404, null, 'Certification entry not found.'));
        }

        expert.certification.pull({ _id: certificationId });
        await expert.save();

        res.status(200).json(new ApiResponse(200, expert.certification, 'Certification deleted successfully'));
    } catch (error) {
        console.error('Error in deleteCertification:', error);
        res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
};


