const axios = require("axios");
const Chat = require("../../models/chat.model");
const Tour = require("../../models/tour.model");

module.exports.getChatResponse = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        let chat = await Chat.findOne({ userId });
        if (!chat) {
            chat = new Chat({ userId, history: [] });
        }

        chat.history.push({ role: "user", content: message });

        const invalidTopics = ["bóng đá", "công nghệ", "nấu ăn", "toán học", "xe cộ"];
        if (invalidTopics.some(topic => message.toLowerCase().includes(topic))) {
            return res.json({ reply: "Mình chỉ hỗ trợ về du lịch thôi nhé! 🚀" });
        }

        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        let suggestedTours = "";
        const tours = await Tour.find();

        if (tours.length > 0) {
            suggestedTours = "Dưới đây là một số tour bạn có thể tham khảo:\n" +
                tours.map(tour => `- ${tour.title} (${tour.price} VND)`).join("\n");
        }

        const messages = [
            {
                role: "system",
                content: `Bạn là một trợ lý du lịch. Hôm nay là tháng ${month}/${year}. 
                Hãy cung cấp thông tin hữu ích về các điểm du lịch, lịch trình và mẹo du lịch. 
                Không đề cập đến bất kỳ thương hiệu hay website nào.\n${suggestedTours}`
            },
            ...chat.history,
        ];

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "deepseek/deepseek-r1:free",
                messages,
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "GoTravel",
                    "Content-Type": "application/json",
                },
            }
        );

        const reply = response.data.choices?.[0]?.message?.content || "No response received.";
        chat.history.push({ role: "assistant", content: reply });
        await chat.save();

        res.json({ reply });
    } catch (error) {
        console.error("Error calling OpenRouter API:", error);
        res.status(500).json({ error: "Có lỗi xảy ra!" });
    }
};
