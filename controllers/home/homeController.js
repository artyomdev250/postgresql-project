exports.home = async (req, res) => {
    return res.status(200).json({
        username: req.user.username,
        email: req.user.email,
    });
};
