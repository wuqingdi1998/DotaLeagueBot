import discord
from discord import app_commands
from discord.ext import commands
import io


# 1. КЛАСС КНОПКИ ПОДТВЕРЖДЕНИЯ
class ConfirmSendView(discord.ui.View):
    def __init__(self, channel, username, avatar_url, content, embed, files_data):
        super().__init__(timeout=300)
        self.channel = channel
        self.username = username
        self.avatar_url = avatar_url
        self.content = content
        self.embed = embed
        self.files_data = files_data  # Список кортежей [(имя, байты)]

    @discord.ui.button(label="Отправить в канал", style=discord.ButtonStyle.green, emoji="🚀")
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        # Чтобы кнопка не "думала" вечно после нажатия
        await interaction.response.defer(ephemeral=True)

        try:
            webhook = await self.channel.create_webhook(name="TempSender")

            final_files = []
            for f_name, f_bytes in self.files_data:
                # Создаем файл из байтов для отправки
                final_files.append(discord.File(io.BytesIO(f_bytes), filename=f_name))
                # Если есть рамка (embed), привязываем картинку к ней, чтобы не было дубля
                if self.embed:
                    self.embed.set_image(url=f"attachment://{f_name}")

            await webhook.send(
                content=self.content,
                embed=self.embed,
                files=final_files,
                username=self.username,
                avatar_url=self.avatar_url,
                allowed_mentions=discord.AllowedMentions.all()
            )

            await webhook.delete()
            self.stop()  # Отключаем View
            await interaction.followup.send(f"✅ Опубликовано в {self.channel.mention}", ephemeral=True)

        except Exception as e:
            await interaction.followup.send(f"❌ Ошибка отправки: {e}", ephemeral=True)


# 2. ОСНОВНОЙ КЛАСС КОГОВ
class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="say", description="[Admin] Сообщение через вебхук с кнопкой и эмодзи")
    @app_commands.checks.has_permissions(administrator=True)
    async def say(self, interaction: discord.Interaction,
                  channel: discord.TextChannel,
                  text: str = None,
                  title: str = None,
                  image: discord.Attachment = None,
                  ping_role: discord.Role = None,
                  ping_everyone: bool = False,
                  username: str = "League System",
                  avatar_url: str = None):

        # Превью всегда скрытое (ephemeral)
        await interaction.response.defer(ephemeral=True)

        if not text and not title and not image:
            return await interaction.followup.send("❌ Напишите хотя бы что-то!", ephemeral=True)

        try:
            # --- Обработка Эмодзи ---
            proc_text = text or ""
            proc_title = title or ""
            for emoji in self.bot.emojis:
                emoji_code = f":{emoji.name}:"
                if emoji_code in proc_text: proc_text = proc_text.replace(emoji_code, str(emoji))
                if emoji_code in proc_title: proc_title = proc_title.replace(emoji_code, str(emoji))

            # --- Формирование Пингов ---
            mentions = ""
            if ping_everyone: mentions += "@everyone "
            if ping_role: mentions += f"{ping_role.mention} "

            # --- Подготовка Контента ---
            final_embed = None
            final_content = mentions
            files_to_save = []
            preview_files = []

            # Если есть картинка, читаем её один раз
            if image:
                img_data = await image.read()
                files_to_save.append((image.filename, img_data))
                # Для превью тоже создаем объект файла
                preview_files.append(discord.File(io.BytesIO(img_data), filename=image.filename))

            if title:
                final_embed = discord.Embed(title=proc_title, description=proc_text, color=discord.Color.gold())
                if image:
                    final_embed.set_image(url=f"attachment://{image.filename}")
            else:
                final_content += f"\n{proc_text}"

            # --- Создание View и Превью-сообщения ---
            current_avatar = avatar_url or self.bot.user.display_avatar.url

            # Вот та самая переменная view
            confirm_view = ConfirmSendView(
                channel=channel,
                username=username,
                avatar_url=current_avatar,
                content=final_content,
                embed=final_embed,
                files_data=files_to_save
            )

            # Вот та самая переменная preview_msg
            preview_msg = f"**ПРЕВЬЮ ДЛЯ КАНАЛА {channel.mention}:**\n"

            await interaction.followup.send(
                content=preview_msg + final_content,
                embed=final_embed,
                view=confirm_view,
                files=preview_files,
                ephemeral=True
            )

        except Exception as e:
            await interaction.followup.send(f"❌ Произошла ошибка: {e}", ephemeral=True)


async def setup(bot):
    await bot.add_cog(Admin(bot))